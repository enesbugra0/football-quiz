import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Mic, MicOff, Heart, HeartCrack, Trophy, AlertCircle } from 'lucide-react';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState('lobby'); // lobby, waiting, countdown, team_selection, guessing, finished
  const [roomId, setRoomId] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [turn, setTurn] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
  const [lives, setLives] = useState(2);
  const [opponentLives, setOpponentLives] = useState(2);
  const [countdown, setCountdown] = useState(3);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'tr-TR';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Socket listeners
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('waiting_for_opponent', () => setGameState('waiting'));
    
    socket.on('match_found', ({ roomId, playerIndex }) => {
      setRoomId(roomId);
      setPlayerIndex(playerIndex);
      setGameState('countdown');
      let c = 3;
      setCountdown(c);
      const int = setInterval(() => {
        c -= 1;
        if (c > 0) setCountdown(c);
        else clearInterval(int);
      }, 1000);
    });

    socket.on('team_selection_start', ({ turn }) => {
      setGameState('team_selection');
      setTurn(turn);
      setErrorMessage('');
    });

    socket.on('team_invalid', ({ message }) => {
      setErrorMessage(message);
    });

    socket.on('team_selected', ({ team1, turn }) => {
      setTeam1(team1);
      setTurn(turn);
      setErrorMessage('');
    });

    socket.on('game_start', ({ team1, team2 }) => {
      setTeam1(team1);
      setTeam2(team2);
      setGameState('guessing');
      setErrorMessage('');
    });

    socket.on('wrong_guess', ({ lives }) => {
      setLives(lives);
      setErrorMessage('Yanlış tahmin! Bir canın gitti.');
      setTimeout(() => setErrorMessage(''), 3000);
    });

    socket.on('opponent_wrong_guess', ({ opponentLives }) => {
      setOpponentLives(opponentLives);
    });

    socket.on('game_over', ({ winner, correctPlayer }) => {
      setGameState('finished');
      setResult({ winner, correctPlayer });
    });

    socket.on('opponent_disconnected', () => {
      alert('Rakip oyundan ayrıldı!');
      window.location.reload();
    });

    return () => {
      socket.off('waiting_for_opponent');
      socket.off('match_found');
      socket.off('team_selection_start');
      socket.off('team_invalid');
      socket.off('team_selected');
      socket.off('game_start');
      socket.off('wrong_guess');
      socket.off('opponent_wrong_guess');
      socket.off('game_over');
      socket.off('opponent_disconnected');
    };
  }, []);

  const joinGame = () => {
    socket.emit('join_game');
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const submitTeam = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    socket.emit('select_team', { roomId, team: inputValue });
    setInputValue('');
  };

  const submitGuess = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    socket.emit('make_guess', { roomId, playerGuess: inputValue });
    setInputValue('');
  };

  const renderLives = (count, isOpponent = false) => {
    const hearts = [];
    for (let i = 0; i < 2; i++) {
      if (i < count) {
        hearts.push(<Heart key={i} className={`w-8 h-8 ${isOpponent ? 'text-red-400' : 'text-red-500'} fill-current`} />);
      } else {
        hearts.push(<HeartCrack key={i} className="w-8 h-8 text-gray-500" />);
      }
    }
    return <div className="flex gap-2">{hearts}</div>;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <div className="stadium-lights"></div>
      
      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 text-sm bg-black/50 px-3 py-1 rounded-full border border-white/10">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-gray-300">{isConnected ? 'Sunucu Bağlı' : 'Bağlantı Bekleniyor...'}</span>
      </div>

      <div className="relative z-10 w-full max-w-2xl bg-black/40 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
        <h1 className="text-4xl font-display font-bold text-center mb-8 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500 uppercase">
          Futbol Kesişim
        </h1>

        {gameState === 'lobby' && (
          <div className="text-center">
            <p className="text-lg text-gray-300 mb-8">Gerçek zamanlı futbolcu tahmin yarışmasına hoş geldin. Rakibini bul ve bilgini sına!</p>
            <button 
              onClick={joinGame}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            >
              Maç Bul
            </button>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-xl animate-pulse">Rakip aranıyor...</p>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="text-center py-12">
            <h2 className="text-8xl font-black text-emerald-400 animate-bounce">{countdown}</h2>
            <p className="text-xl mt-4 text-gray-300">Maç başlıyor!</p>
          </div>
        )}

        {gameState === 'team_selection' && (
          <div className="text-center">
            <h2 className="text-2xl mb-6">
              {turn === socket.id ? "Sıra Sende: Bir Takım Söyle!" : "Rakibin takım seçmesi bekleniyor..."}
            </h2>
            
            {team1 && <div className="mb-6 p-4 bg-white/10 rounded-xl">Takım 1: <span className="font-bold text-emerald-400">{team1}</span></div>}

            {turn === socket.id && (
              <form onSubmit={submitTeam} className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-md">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Takım adı (Örn: Galatasaray)"
                    className="w-full px-6 py-4 rounded-full bg-black/50 border border-emerald-500/30 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button 
                    type="button"
                    onClick={toggleListen}
                    className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {isListening ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-gray-300" />}
                  </button>
                </div>
                {errorMessage && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{errorMessage}</p>}
                <button type="submit" className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-bold transition-colors">
                  Seç
                </button>
              </form>
            )}
          </div>
        )}

        {gameState === 'guessing' && (
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-between w-full mb-8">
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-400 mb-2">Senin Canın</span>
                {renderLives(lives)}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-400 mb-2">Rakibin Canı</span>
                {renderLives(opponentLives, true)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 mb-12 w-full">
              <div className="flex-1 text-center p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-2xl font-bold text-emerald-400">{team1}</h3>
              </div>
              <div className="text-3xl font-black text-gray-500">VS</div>
              <div className="flex-1 text-center p-6 bg-white/5 rounded-2xl border border-white/10">
                <h3 className="text-2xl font-bold text-emerald-400">{team2}</h3>
              </div>
            </div>

            <form onSubmit={submitGuess} className="flex flex-col items-center gap-4 w-full">
              <h4 className="text-lg text-gray-300 mb-2">Her iki takımda da oynamış bir futbolcu söyle:</h4>
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Futbolcu adı..."
                  className="w-full px-6 py-4 rounded-full bg-black/50 border border-emerald-500/30 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button 
                  type="button"
                  onClick={toggleListen}
                  className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {isListening ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-gray-300" />}
                </button>
              </div>
              {errorMessage && <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{errorMessage}</p>}
              <button type="submit" className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                Tahmin Et
              </button>
            </form>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center">
            <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-6" />
            <h2 className="text-4xl font-bold mb-4">
              {result.winner === 'draw' 
                ? "Berabere!" 
                : result.winner === socket.id 
                  ? "Kazandın!" 
                  : "Kaybettin!"}
            </h2>
            
            {result.correctPlayer ? (
              <div className="p-6 bg-white/10 rounded-2xl mb-8">
                <p className="text-gray-300 mb-2">Doğru Cevap:</p>
                <p className="text-3xl font-bold text-emerald-400">{result.correctPlayer}</p>
              </div>
            ) : (
              <p className="text-gray-400 mb-8">Kimse doğru cevabı bulamadı.</p>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 border border-emerald-500 hover:bg-emerald-500/20 text-white rounded-full font-bold transition-colors"
            >
              Tekrar Oyna
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
