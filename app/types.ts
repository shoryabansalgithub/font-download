export interface FontInfo {
    name: string;
    family: string;
    format: string;
    url: string;
    weight?: string;
    style?: string;
    referer?: string;
    alternatives?: FontAlternative[];
}

/** Scan results extract lifecycle (UI state machine). */
export type ExtractStatus = 'loading' | 'success' | 'empty' | 'error';

export interface FontAlternative {
    family: string;
    category?: string;
    variants?: string[];
    downloadUrl: string;
    previewUrl?: string;
    reason?: string;
    similarity?: number;
}
