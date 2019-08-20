from index import app


if __name__ == "__main__":
    # Serving using gunicorn --bind 127.0.0.1:5000 wsgi:app
    app.run()
