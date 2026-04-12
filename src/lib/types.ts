export interface UserSession {
  id: string;
  username: string;
  role: string;
}

export interface HttpRequestData {
  id: string;
  requesterId: string;
  approverId?: string | null;
  method: string;
  url: string;
  headers?: string | null;
  body?: string | null;
  status: string;
  response?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  approvedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  executedAt?: string | Date | null;
  requester?: {
    username: string;
  };
}

export interface RequestCollectionData {
  id: string;
  name: string;
  creatorId: string;
  method: string;
  url: string;
  headers?: string | null;
  body?: string | null;
  isGlobal: boolean;
  createdAt: string | Date;
  creator?: {
    username: string;
    role: string;
  };
}
