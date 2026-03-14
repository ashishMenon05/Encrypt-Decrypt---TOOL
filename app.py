from flask import Flask, render_template, request, jsonify, send_file
from cryptography.fernet import Fernet
import io
import os
from datetime import datetime

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# ── Encryption Key Management ──────────────────────────────────────────────────
# In Docker: mount a volume at /data and set KEY_FILE=/data/encryption.key
# Locally:   defaults to ./encryption.key (current working directory)
KEY_FILE = os.environ.get('ENCRYPTION_KEY_PATH', 'encryption.key')

def load_or_create_key():
    """Load existing key from file, or generate and save a new one."""
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, 'rb') as f:
            return f.read()
    key = Fernet.generate_key()
    # Ensure parent directory exists (useful when KEY_FILE is /data/encryption.key)
    os.makedirs(os.path.dirname(os.path.abspath(KEY_FILE)), exist_ok=True)
    with open(KEY_FILE, 'wb') as f:
        f.write(key)
    return key

# Global cipher — reloaded on key rotation
ENCRYPTION_KEY = load_or_create_key()
cipher = Fernet(ENCRYPTION_KEY)


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


# ── Text Endpoints ─────────────────────────────────────────────────────────────

@app.route('/api/encrypt-text', methods=['POST'])
def encrypt_text():
    """Encrypt plain text."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400
        text = data.get('text', '')
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        encrypted = cipher.encrypt(text.encode()).decode()
        return jsonify({
            'success': True,
            'encrypted': encrypted,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/decrypt-text', methods=['POST'])
def decrypt_text():
    """Decrypt encrypted text."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400
        encrypted_text = data.get('encrypted', '')
        if not encrypted_text:
            return jsonify({'error': 'No encrypted text provided'}), 400

        decrypted = cipher.decrypt(encrypted_text.encode()).decode()
        return jsonify({
            'success': True,
            'decrypted': decrypted,
            'timestamp': datetime.now().isoformat()
        })
    except Exception:
        return jsonify({'error': 'Failed to decrypt. Invalid text or wrong key.'}), 400


# ── File Endpoints ─────────────────────────────────────────────────────────────

@app.route('/api/encrypt-file', methods=['POST'])
def encrypt_file():
    """Encrypt an uploaded file and return it as a download."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        file_content = file.read()
        encrypted = cipher.encrypt(file_content)

        output = io.BytesIO(encrypted)
        encrypted_filename = f"{file.filename}.enc"
        return send_file(
            output,
            as_attachment=True,
            download_name=encrypted_filename,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/decrypt-file', methods=['POST'])
def decrypt_file():
    """Decrypt an uploaded .enc file and return the original."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        file_content = file.read()
        try:
            decrypted = cipher.decrypt(file_content)
        except Exception:
            return jsonify({'error': 'Failed to decrypt file. Invalid file or wrong key.'}), 400

        original_filename = file.filename
        if original_filename.endswith('.enc'):
            output_filename = original_filename[:-4]
        else:
            output_filename = f"{original_filename}_decrypted"

        output = io.BytesIO(decrypted)
        return send_file(
            output,
            as_attachment=True,
            download_name=output_filename,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Key Management Endpoints ───────────────────────────────────────────────────

@app.route('/api/key-info', methods=['GET'])
def key_info():
    """Return a safe preview of the current encryption key."""
    try:
        key_str = ENCRYPTION_KEY.decode()
        # Show first 6 and last 6 characters only — never expose the full key
        preview = f"{key_str[:6]}...{key_str[-6:]}" if len(key_str) > 12 else "Key is set"
        return jsonify({
            'key_set': True,
            'key_preview': preview,
            'key_length': len(key_str)
        })
    except Exception:
        return jsonify({'key_set': True, 'key_preview': 'Unknown'}), 500


@app.route('/api/generate-key', methods=['POST'])
def generate_key():
    """Generate a new Fernet key and replace the stored key.

    ⚠️  WARNING: All data encrypted with the old key will become unreadable.
    """
    global ENCRYPTION_KEY, cipher
    try:
        new_key = Fernet.generate_key()
        with open(KEY_FILE, 'wb') as f:
            f.write(new_key)
        ENCRYPTION_KEY = new_key
        cipher = Fernet(ENCRYPTION_KEY)
        return jsonify({
            'success': True,
            'message': 'New encryption key generated. Old encrypted data is no longer decryptable.',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Entry Point ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
