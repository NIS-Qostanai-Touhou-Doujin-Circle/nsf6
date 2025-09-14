# main.py

import os
import pickle
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List

import numpy as np
import pandas as pd
import tensorflow as tf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

# --- Глобальные переменные для хранения артефактов ---
# Мы будем заполнять этот словарь во время события "lifespan"
ml_models = {}

# --- ИЗМЕНЕНИЕ 1: Используем новый, рекомендованный 'lifespan' вместо 'on_event' ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Этот код выполняется ОДИН РАЗ при старте сервера
    print("Loading model and artifacts...")
    try:
        model_dir = "models"
        ml_models["model"] = load_model(os.path.join(model_dir, "route_autoencoder_FULL_model.keras"))
        
        with open(os.path.join(model_dir, "route_scaler_FULL_for_anomaly.pkl"), 'rb') as f:
            ml_models["scaler"] = pickle.load(f)
            
        with open(os.path.join(model_dir, "route_threshold_FULL.txt"), 'r') as f:
            ml_models["threshold"] = float(f.read())
            
        ml_models["max_len"] = ml_models["model"].input_shape[1]
        
        print("="*50)
        print("Artifacts loaded successfully!")
        print(f"Threshold: {ml_models['threshold']}")
        print(f"Max Sequence Length: {ml_models['max_len']}")
        print("="*50)

    except FileNotFoundError as e:
        print(f"FATAL ERROR: Could not find model file - {e}")
        raise RuntimeError(f"Could not load model artifacts: {e}")
    
    yield  # Сервер работает здесь
    
    # Этот код выполняется при остановке сервера (опционально)
    print("Cleaning up ML models.")
    ml_models.clear()

# --- Создаем приложение FastAPI с новым 'lifespan' ---
app = FastAPI(
    title="AI Safety Net - Anomaly Detection API",
    description="Real-time analysis of trip routes to detect anomalies.",
    version="1.0.0",
    lifespan=lifespan
)

# --- Pydantic-модели для валидации данных ---
class Point(BaseModel):
    lat: float
    lng: float
    azm: float
    timestamp: datetime

class TripData(BaseModel):
    first: Point
    second: Point
    gone: List[Point]

# --- Основная логика анализа ---
def analyze_route(points: List[Point]) -> int:
    MIN_POINTS_FOR_ANALYSIS = 5
    if len(points) < MIN_POINTS_FOR_ANALYSIS:
        return 1

    trip_coords = np.array([[p.lat, p.lng] for p in points])
    
    scaled_trip = ml_models["scaler"].transform(trip_coords)
    padded_trip = pad_sequences([scaled_trip], maxlen=ml_models["max_len"], padding='post', dtype='float32')
    reconstruction = ml_models["model"].predict(padded_trip, verbose=0)
    loss = tf.keras.losses.mae(reconstruction, padded_trip)[0]
    mean_loss = np.mean(loss[:len(trip_coords)])
    
    is_anomaly = mean_loss > ml_models["threshold"]
    return -1 if is_anomaly else 1

# --- API Эндпоинт ---
@app.post("/check_trip")
async def check_trip_endpoint(trip_data: TripData) -> dict:
    if "model" not in ml_models:
        raise HTTPException(status_code=503, detail="Model is not loaded or failed to load.")
    
    status_code = analyze_route(trip_data.gone)
    return {"status": status_code}

@app.get("/")
def read_root():
    return {"status": "Anomaly Detection API is running"}
