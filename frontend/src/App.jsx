import { useState, useRef } from 'react';
import './App.css';

function App() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [triage, setTriage] = useState(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      setAudioURL(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const sendForTranscription = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setTranscript('');
    setTriage(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'order.webm');

    try {
      const res = await fetch('https://order-sense-backend.onrender.com/api/transcribe-audio', {        method: 'POST',
        body: formData
      });
      const data = await res.json();
      const text = data.text || data.error || 'No transcript returned';
      setTranscript(text);

      if (data.text) {
        const triageRes = await fetch('https://order-sense-backend.onrender.com/api/triage', {
          method: 'POST'
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderText: data.text })
        });
        const triageData = await triageRes.json();
        setTriage(triageData);
      }
    } catch (err) {
      setTranscript('Error: ' + err.message);    } finally {
      setLoading(false);
    }
  };

  const urgencyColor = {
    high: '#ff4d4d',
    medium: '#ffcc00',
    low: '#4caf50'
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Order Sense</h1>
      <p>Record a voice order</p>

      {!recording ? (
        <button onClick={startRecording} style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}>
          🎙️ Start Recording
        </button>
      ) : (
        <button onClick={stopRecording} style={{ padding: '1rem 2rem', fontSize: '1.2rem', background: 'red', color: 'white' }}>
          ⏹️ Stop Recording
        </button>
      )}

      {audioURL && (
        <div style={{ marginTop: '2rem' }}>
          <audio controls src={audioURL}></audio>
          <br />
          <button onClick={sendForTranscription} style={{ marginTop: '1rem', padding: '0.8rem 1.5rem' }}>
            📤 Send for Transcription
          </button>
        </div>
      )}

      {loading && <p>Processing...</p>}

      {transcript && (
        <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '500px', margin: '2rem auto' }}>
          <h3>Transcript:</h3>
          <p>{transcript}</p>
        </div>
      )}

      {triage && (
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'left',
          maxWidth: '500px',
          margin: '1.5rem auto',
          border: `3px solid ${urgencyColor[triage.urgency]}`,
          borderRadius: '10px',
          padding: '1rem'
        }}>
          <h3>Order Triage</h3>
          <p><strong>Urgency:</strong> <span style={{ color: urgencyColor[triage.urgency] }}>{triage.urgency.toUpperCase()}</span></p>
          <p><strong>Estimated Prep Time:</strong> {triage.prepTime}</p>
          {triage.ambiguous && (
            <p style={{ color: '#ff9800' }}>⚠️ Flagged: {triage.flagReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
