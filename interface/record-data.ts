export interface RecordServerrecognitionObj {
      event_id: string;
      deb_style: string;
      user: string;
      role: string;
      speech_id: number;
      short_split_id: number;
      speech_type: string;
      sample_rate: number;
      record_end_type?: string;
      each_speech_duration?: number;
      whole_speech_duration?: number;
      languageCode?: string;
}

