import axios from 'axios';
import { useAuthStore } from '../store/auth';
import {
  User,
  Klasse,
  Schueler,
  Arbeit,
  ScanSeite,
  Korrektur,
  Ergebnis,
} from '../types';

const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3100/api'
  : 'http://46.225.218.211:3100/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

export const register = async (email: string, password: string, name: string): Promise<{ token: string; user: User }> => {
  const res = await apiClient.post('/auth/register', { email, password, name });
  return res.data;
};

// Klassen
export const getKlassen = async (): Promise<Klasse[]> => {
  const res = await apiClient.get('/klassen');
  return res.data;
};

export const createKlasse = async (data: Omit<Klasse, 'id'>): Promise<Klasse> => {
  const res = await apiClient.post('/klassen', data);
  return res.data;
};

// Schueler
export const getSchueler = async (klasseId: number): Promise<Schueler[]> => {
  const res = await apiClient.get(`/klassen/${klasseId}/schueler`);
  return res.data;
};

export const createSchueler = async (klasseId: number, data: Omit<Schueler, 'id' | 'klasse_id'>): Promise<Schueler> => {
  const res = await apiClient.post(`/klassen/${klasseId}/schueler`, data);
  return res.data;
};

// Arbeiten
export const getArbeiten = async (klasseId?: number): Promise<Arbeit[]> => {
  const params = klasseId ? { klasse_id: klasseId } : {};
  const res = await apiClient.get('/arbeiten', { params });
  return res.data;
};

export const createArbeit = async (data: Omit<Arbeit, 'id'>): Promise<Arbeit> => {
  const res = await apiClient.post('/arbeiten', data);
  return res.data;
};

export const getArbeit = async (arbeitId: number): Promise<Arbeit> => {
  const res = await apiClient.get(`/arbeiten/${arbeitId}`);
  return res.data;
};

// QR Codes
export const getQrCodes = async (arbeitId: number): Promise<{ url: string }> => {
  const res = await apiClient.get(`/arbeiten/${arbeitId}/qrcodes`);
  return res.data;
};

// Scans
export const uploadScan = async (arbeitId: number, formData: FormData): Promise<ScanSeite> => {
  const res = await apiClient.post(`/arbeiten/${arbeitId}/scans`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getScans = async (arbeitId: number): Promise<ScanSeite[]> => {
  const res = await apiClient.get(`/arbeiten/${arbeitId}/scans`);
  return res.data;
};

// Korrekturen
export const triggerKorrektur = async (scanSeiteId: number): Promise<{ message: string }> => {
  const res = await apiClient.post(`/scans/${scanSeiteId}/korrektur`);
  return res.data;
};

export const getKorrektur = async (scanSeiteId: number): Promise<Korrektur> => {
  const res = await apiClient.get(`/scans/${scanSeiteId}/korrektur`);
  return res.data;
};

export const updateKorrektur = async (korrekturId: number, data: Partial<Korrektur>): Promise<Korrektur> => {
  const res = await apiClient.put(`/korrekturen/${korrekturId}`, data);
  return res.data;
};

export const bestaetigeKorrektur = async (korrekturId: number): Promise<Korrektur> => {
  const res = await apiClient.post(`/korrekturen/${korrekturId}/bestaetigen`);
  return res.data;
};

// Ergebnisse
export const getErgebnisse = async (arbeitId: number): Promise<Ergebnis[]> => {
  const res = await apiClient.get(`/arbeiten/${arbeitId}/ergebnisse`);
  return res.data;
};

export const generiereErgebnisse = async (arbeitId: number): Promise<Ergebnis[]> => {
  const res = await apiClient.post(`/arbeiten/${arbeitId}/ergebnisse/generieren`);
  return res.data;
};

export default apiClient;
