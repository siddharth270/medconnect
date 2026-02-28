import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createSpeechRecognition, AudioRecorder } from '../../utils/ai';
import {
  Mic, MicOff, Square, Pause, Play,
  Clock, FileText, Pill, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecordingSession() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, consultType } = location.state || {};

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const recorderRef = useRef(new AudioRecorder());
  const timerRef = useRef(null);
  const transcriptRef = useRef('');
  const transcriptContainerRef = useRef(null);

  // Redirect if no patient selected
  useEffect(() => {
    if (!patient || !consultType) {
      navigate('/doctor/consult', { replace: true });
    }
  }, [patient, consultType]);

  // Scroll transcript to bottom
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (recorderRef.current.isRecording) {
        recorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      // Start audio recorder
      await recorderRef.current.start();

      // Start speech recognition
      const recognition = createSpeechRecognition();
      if (!recognition) {
        setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text + ' ';
          } else {
            interim += text;
          }
        }
        if (final) {
          transcriptRef.current += final;
          setTranscript(transcriptRef.current);
        }
        setInterimText(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          // Restart on transient errors
          try { recognition.start(); } catch {}
        }
      };

      recognition.onend = () => {
        // Auto-restart if still recording
        if (isRecording && !isPaused) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error(err);
    }
  }, []);

  const pauseRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPaused(true);
  };

  const resumeRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch {}
    }
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    setIsPaused(false);
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);

    const audioBlob = await recorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);

    const finalTranscript = transcriptRef.current + (interimText ? interimText : '');

    if (!finalTranscript.trim()) {
      toast.error('No speech was detected. Try again.');
      return;
    }

    navigate('/doctor/consult/result', {
      state: {
        patient,
        consultType,
        transcript: finalTranscript.trim(),
        duration,
        audioBlob,
      },
    });
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!patient) return null;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Recording</h2>
          <p className="text-sm text-gray-500">
            {patient.full_name} · {consultType === 'soap_note' ? 'SOAP Notes' : 'Prescription'}
          </p>
        </div>
        <div className={`tag ${consultType === 'soap_note' ? 'bg-brand-500/10 text-brand-400' : 'bg-mint/10 text-mint'}`}>
          {consultType === 'soap_note' ? <FileText size={12} /> : <Pill size={12} />}
          <span className="ml-1">{consultType === 'soap_note' ? 'SOAP' : 'Rx'}</span>
        </div>
      </div>

      {/* Timer & Status */}
      <div className="card text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          {isRecording && !isPaused && <div className="recording-pulse" />}
          <Clock size={16} className="text-gray-400" />
          <span className="font-mono text-4xl font-bold tracking-wider">
            {formatTime(duration)}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {!isRecording ? 'Ready to record' :
           isPaused ? 'Paused' :
           'Recording in progress...'}
        </p>

        {/* Wave Animation */}
        {isRecording && !isPaused && (
          <div className="flex items-center justify-center gap-1 mt-4 h-8">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-brand-400 rounded-full wave-bar"
                style={{ '--delay': `${i * 0.1}s`, minHeight: '4px' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card border-coral/30 bg-coral/5 flex items-start gap-3">
          <AlertCircle size={16} className="text-coral shrink-0 mt-0.5" />
          <p className="text-sm text-coral">{error}</p>
        </div>
      )}

      {/* Live Transcript */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
          Live Transcript
        </h3>
        <div
          ref={transcriptContainerRef}
          className="card min-h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm leading-relaxed"
        >
          {transcript || interimText ? (
            <>
              <span className="text-gray-300">{transcript}</span>
              {interimText && (
                <span className="text-gray-500 italic">{interimText}</span>
              )}
            </>
          ) : (
            <p className="text-gray-600 italic">
              {isRecording
                ? 'Listening... speak clearly into the microphone'
                : 'Transcript will appear here when you start recording'}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-coral flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
          >
            <Mic size={28} className="text-white" />
          </button>
        ) : (
          <>
            {/* Pause / Resume */}
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-14 h-14 rounded-full bg-surface-100 border border-surface-300 flex items-center justify-center active:scale-95 transition-transform"
            >
              {isPaused ? <Play size={20} className="text-mint" /> : <Pause size={20} className="text-amber" />}
            </button>

            {/* Stop */}
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
            >
              <Square size={24} className="text-white" fill="white" />
            </button>

            {/* Mute indicator */}
            <div className="w-14 h-14 rounded-full bg-surface-100 border border-surface-300 flex items-center justify-center">
              {isPaused ? <MicOff size={20} className="text-gray-500" /> : <Mic size={20} className="text-red-400 animate-pulse" />}
            </div>
          </>
        )}
      </div>

      <p className="text-center text-xs text-gray-600">
        {!isRecording
          ? 'Tap the microphone button to begin recording'
          : 'Tap the square button to stop and process the recording'}
      </p>
    </div>
  );
}
