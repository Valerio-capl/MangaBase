import { HTTPError, NetworkError, ParseError, CancelledError } from './SourceErrors.js';

export interface ErrorInfo {
  message: string;
  action: 'retry' | 'home' | 'none';
}

export const getErrorMessage = (error:any): ErrorInfo => {
  if (error instanceof CancelledError) {
    return { message: '', action: 'none' };
  }
  if (error instanceof NetworkError){
    if (error.isTimeout) {
      return {
        message: "The source took too long to respond. Try again later.",
        action: 'retry'
      };
    }
    return {
      message:"No internet connection. Check the Wi-Fi or the mobile data and try again.",
      action: 'retry' 
    };
  }
  if (error instanceof HTTPError){
    if (error.statusCode === 404) {
      return {
        message: "Content not found.",
        action: 'home'
      };
    }
    if (error.statusCode >= 500) {
      return {
        message:"The source server is temporarily unavailable or overloaded. Please try again later.",
        action: 'retry' 
      };
    }
    if (error.statusCode === 403) {
      return {
        message:"Access blocked by the source.",
        action: 'home' 
      };
    }
    if (error.statusCode === 429) {
      return {
        message: "Too many requests. Wait a moment and try again.",
        action: 'retry'
      };
    }
    return {
      message:`Communication error with the source (Code: ${error.statusCode}).`,
      action: 'retry' 
    };
  }
  if (error instanceof ParseError){
    return {
      message:"Unable to read the data.",
      action: "home"
    };
  }
  const code = error?.statusCode ? ` (Code: ${error.statusCode})` : '';
  return {
    message: `An unexpected error occurred. Please try again.${code}`,
    action: 'retry'
  };
}