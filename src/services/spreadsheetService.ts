
export interface SpreadsheetData {
  project: string;
  panelName: string;
  panelCode: string;
}

export interface PengerjaanItem {
  namapanel: string;
  [key: string]: string; // Dynamic teams: { "fabrikasi": "Item 1, Item 2", "tagging": "TG A, TG B", ... }
}

export interface StatusChecklist {
  panelid: string;
  bagian: string;
  itemname: string;
  status: string;
}

export interface LayoutData {
  panelid: string;
  x: number;
  y: number;
  project: string;
  name: string;
  code: string;
  warehouse: string;
}

export interface MasterData {
  projects: {
    name: string;
    panels: {
      name: string;
      codes: string[];
    }[];
  }[];
  teams: string[];
}

export interface AppConfig {
  masterData: MasterData;
  pengerjaan: PengerjaanItem[];
  status: StatusChecklist[];
  layout: LayoutData[];
}

export async function fetchAppData(url: string): Promise<AppConfig> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(`${url}?action=init`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return {
      masterData: data.masterData,
      pengerjaan: data.pengerjaan || [],
      status: data.status || [],
      layout: data.layout || []
    };
  } catch (error) {
    console.error('Error fetching app data:', error);
    throw error;
  }
}

export async function loginUser(url: string, credentials: { username: string; password: string }): Promise<{ 
  status: string; 
  user?: string; 
  role?: string; 
  fullName?: string;
  team?: string;
  message?: string 
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', ...credentials }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { status: 'error', message: `Server Error (${response.status}). Pastikan URL Apps Script benar.` };
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'error', message: 'Koneksi lambat (Timeout). Silakan coba lagi.' };
    }
    return { status: 'error', message: 'Gagal menghubungi server. Periksa URL Apps Script di Settings.' };
  }
}

export async function registerUser(url: string, payload: any): Promise<{ status: string; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', ...payload }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { status: 'error', message: `Server Error (${response.status}).` };
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'error', message: 'Koneksi lambat (Timeout).' };
    }
    return { status: 'error', message: 'Gagal menghubungi server.' };
  }
}

export async function saveLayout(url: string, layout: any[]): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveLayout', layout }),
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function submitChecklist(url: string, payload: { 
  panelId: string; 
  project: string;
  panelName: string;
  panelCode: string;
  bagian: string; 
  items: string[]; 
  user: string 
}): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'submitChecklist', ...payload }),
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function updateMasterData(url: string, masterData: MasterData): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateMasterData', masterData }),
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
}

export async function submitUpdateHistory(url: string, payload: { 
  username: string; 
  project: string; 
  panelName: string; 
  panelCode: string; 
  team: string; 
  bagian: string; 
  items: string[]; 
}): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'submitUpdateHistory', ...payload }),
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    return false;
  }
}
