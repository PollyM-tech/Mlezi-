from flask import Flask, jsonify

from config import Config
from app.extensions import (
    configure_cloudinary,
    cors,
    db,
    jwt,
    migrate,
)


def create_app(test_config=None):
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    @app.errorhandler(413)
    def upload_too_large(error):
        return jsonify(error="Upload too large. Use images under 5 MB each."), 413

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # Configure CORS
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        },
    )

    # JWT error handlers
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify(
            {"error": "Authentication required"}
        ), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify(
            {"error": "Invalid authentication token"}
        ), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify(
            {"error": "Authentication token has expired"}
        ), 401

    # Configure Cloudinary
    configure_cloudinary()

    # Allow URLs with or without trailing slash
    app.url_map.strict_slashes = False

    # Import models so Flask-Migrate can detect them
    from app import models  # noqa: F401

    # Import blueprints
    from app.routes.auth import auth_bp
    from app.routes.caregivers import caregivers_bp

    # Register blueprints
    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth",
    )
    app.register_blueprint(
        caregivers_bp,
        url_prefix="/api/caregivers",
    )

    # Health check
    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "ok": True,
                "service": "nanny-marketplace-api",
            }
        )

    return app
