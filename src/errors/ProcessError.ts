class ProcessError extends Error {
  public data?: Buffer;

  constructor(message?: string, data?: Buffer) {
    super(message);
    this.data = data;
  }
}

export default ProcessError;
