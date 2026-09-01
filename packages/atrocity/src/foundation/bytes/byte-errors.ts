export class ByteBoundsError extends RangeError {
  constructor(message = "Byte operation exceeds buffer bounds.") {
    super(message);
    this.name = "ByteBoundsError";
  }
}

export class ByteFormatError extends TypeError {
  constructor(message = "Invalid byte representation.") {
    super(message);
    this.name = "ByteFormatError";
  }
}
