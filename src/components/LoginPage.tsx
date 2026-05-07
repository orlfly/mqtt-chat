import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onLogin(username, password);
    } catch (err) {
      console.error('Login failed:', err);
      setError('登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%',
        backgroundColor: '#f2f2f2',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          p: 3,
          borderRadius: 2,
        }}
      >
        <Typography
          component="h1"
          variant="h5"
          sx={{ 
            fontWeight: 600, 
            color: '#171717',
            mb: 3,
            textAlign: 'center'
          }}
        >
          登录
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            inputRef={inputRef}
            margin="normal"
            required
            fullWidth
            id="username"
            label="用户"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f9fafb',
                borderRadius: 2,
              }
            }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="密码"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f9fafb',
                borderRadius: 2,
              }
            }}
          />
          
          {error && (
            <Typography 
              color="error" 
              variant="body2" 
              sx={{ mt: 1, mb: 1, textAlign: 'center' }}
            >
              {error}
            </Typography>
          )}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ 
              mt: 2, 
              py: 1.5,
              backgroundColor: '#007bff',
              borderRadius: 6,
              '&:hover': {
                backgroundColor: '#0056b3',
              },
              '&:disabled': {
                backgroundColor: '#ccc',
              }
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : '确定'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;