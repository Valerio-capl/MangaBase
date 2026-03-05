import { NetworkError, HTTPError, ParseError } from './SourceErrors.js';

export interface ErrorInfo {
  message: string;
  action: 'retry' | 'home' | 'none';
}

export const getErrorMessage = (error:any): ErrorInfo => {
  if (error instanceof NetworkError){
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
  return {
    message: `An unexpected error occurred. Please try again. (Code: ${error.statusCode})`,
    action: 'retry'};
}