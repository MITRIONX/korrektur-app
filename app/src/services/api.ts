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

// Response interceptor: auto-logout on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

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

export const updateKlasse = async (id: number, data: Partial<Klasse>): Promise<Klasse> => {
  const res = await apiClient.put(`/klassen/${id}`, data);
  return res.data;
};

export const deleteKlasse = async (id: number): Promise<void> => {
  await apiClient.delete(`/klassen/${id}`);
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

export const updateSchueler = async (klasseId: number, schuelerId: number, data: Partial<Schueler>): Promise<Schueler> => {
  const res = await apiClient.put(`/klassen/${klasseId}/schueler/${schuelerId}`, data);
  return res.data;
};

export const schuelerAustreten = async (klasseId: number, schuelerId: number): Promise<Schueler> => {
  const res = await apiClient.put(`/klassen/${klasseId}/schueler/${schuelerId}/austreten`);
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

export const updateArbeit = async (arbeitId: number, data: Partial<Arbeit>): Promise<Arbeit> => {
  const res = await apiClient.put(`/arbeiten/${arbeitId}`, data);
  return res.data;
};

export const deleteArbeit = async (arbeitId: number): Promise<void> => {
  await apiClient.delete(`/arbeiten/${arbeitId}`);
};

export const analysiereArbeit = async (arbeitId: number, hinweis?: string): Promise<any> => {
  const res = await apiClient.post(`/arbeiten/${arbeitId}/analysieren`, { hinweis });
  return res.data;
};

export const getArbeit = async (arbeitId: number): Promise<Arbeit> => {
  const res = await apiClient.get(`/arbeiten/${arbeitId}`);
  return res.data;
};

export const uploadArbeitPdf = async (arbeitId: number, pdfUri: string, fileName: string): Promise<Arbeit> => {
  const formData = new FormData();
  formData.append('pdf', { uri: pdfUri, type: 'application/pdf', name: fileName } as any);
  const res = await apiClient.post(`/arbeiten/${arbeitId}/upload-pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const generateArbeitPdfs = async (
  arbeitId: number,
  schuelerIds: number[],
  qrX: number,
  qrY: number
): Promise<{ pdf_path: string; schueler_count: number }> => {
  const res = await apiClient.post(`/arbeiten/${arbeitId}/generate-pdfs`, {
    schueler_ids: schuelerIds,
    qr_x: qrX,
    qr_y: qrY,
  });
  return res.data;
};

export const downloadArbeitPdf = (arbeitId: number): string => {
  const token = useAuthStore.getState().token;
  return `${BASE_URL}/arbeiten/${arbeitId}/download-pdf?token=${token}`;
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
export const triggerKorrektur = async (scanSeiteId: number): Promise<any> => {
  const res = await apiClient.post(`/scans/${scanSeiteId}/korrigieren`);
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
