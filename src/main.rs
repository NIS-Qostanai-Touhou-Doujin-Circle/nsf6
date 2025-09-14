use actix_files as fs;
use actix_web::{web, App, HttpServer, middleware};
use env_logger::Env;
use log::info;
use dotenvy::dotenv;
use sea_orm::Database;
use sea_orm_migration::MigratorTrait;
use std::env;
mod routes;
mod templates;
mod image_compressor;
mod database;
mod api;
mod migration;
use api::{points, heatmap, traficmap, velocitymap, anomalies};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables from .env if present
    dotenv().ok();

    // Initialize logger (RUST_LOG overrides default if set)
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

    // Establish database connection and run migrations before starting the server
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set (e.g., postgres://user:pass@host:5432/db)");
    let db = Database::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run pending migrations (idempotent)
    migration::Migrator::up(&db, None)
        .await
        .expect("Failed to run database migrations");

    info!("Server running at http://127.0.0.1:8080");
    HttpServer::new(move || {
        App::new()
            .wrap(actix_web::middleware::Compress::default())
            // Log each incoming request with status, time, and size
            .wrap(middleware::Logger::new("%a \"%r\" %s %b %T"))
            // Share DB connection pool with handlers
            .app_data(web::Data::new(db.clone()))
            .route("/static/assets/img/{filename:.*}", web::get().to(image_compressor::serve_optimized_image))
            .service(
                fs::Files::new("/static", "web/out/static")
                    .prefer_utf8(true)
                    .use_etag(true)
                    .use_last_modified(true)
            )
            .route("/", web::get().to(routes::index))
            .route("/paint", web::get().to(routes::paint))
            .route("/map", web::get().to(routes::map))
            .service(web::scope("/api")
                .wrap(middleware::NormalizePath::trim())
                .configure(points::init_routes)
                .configure(heatmap::init_routes)
                .configure(traficmap::init_routes)
                .configure(velocitymap::init_routes)
                .configure(anomalies::init_routes)
            )
            .default_service(web::route().to(routes::not_found))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
