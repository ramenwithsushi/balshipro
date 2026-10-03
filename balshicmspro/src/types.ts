export interface PostItem {
  id: number;
  title: string;
  image_path: string;
  caption: string;
  post_timestamp: number; // Epoch seconds
  status: 'Scheduled' | 'Posted' | 'Failed';
  imageDataUrl?: string;
  previewUrl?: string;
  created_at?: string;
}

export interface PublisherStep {
  id: number;
  name: string;
  detail: string;
  endpoint?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  log?: string;
}

export interface MetaConfig {
  igUserId: string;
  accessToken: string;
  ngrokAuthtoken: string;
  ngrokDomain: string;
  localPort: string;
}
