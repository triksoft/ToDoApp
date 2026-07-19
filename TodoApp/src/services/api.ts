import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use 127.0.0.1 because we will map port 5000 via adb reverse
const API_URL = 'http://192.168.1.17:5001/api'; 

const api = axios.create({ 
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout to catch broken bridges immediately
});

api.interceptors.request.use(async (config: any) => {
  const token = await AsyncStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;