export interface Paper {
  id: number;
  title: string;
  source: string;
  note: string | null;
  added_at: string;
  completed_at: string | null;
}

export interface PaperCreate {
  title: string;
  source: string;
}
