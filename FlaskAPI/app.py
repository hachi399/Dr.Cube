from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"message": "Hello from Flask on Render!"})

@app.route("/api/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    text = request.form.get("text")

    return jsonify({
        "filename": file.filename if file else None,
        "text": text
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
