// src/utils/eventEmitter.js
class EventEmitterClass {
    constructor() {
      this.events = {};
    }
  
    subscribe(eventName, callback) {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }
      
      this.events[eventName].push(callback);
      
      return {
        remove: () => {
          this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        }
      };
    }
  
    emit(eventName, data) {
      if (!this.events[eventName]) return;
      
      this.events[eventName].forEach(callback => {
        callback(data);
      });
    }
  }
  
  export const EventEmitter = new EventEmitterClass();