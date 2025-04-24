export interface TwitterMention {
  text: string;
  user: {
    id_str: string;
    screen_name: string;
  };
} 