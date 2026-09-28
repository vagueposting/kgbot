export class Timestamp {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;

  constructor(
    days: number = 0,
    hours: number = 0,
    minutes: number = 0,
    seconds: number = 0,
  ) {
    this.days = days;
    this.hours = hours;
    this.minutes = minutes;
    this.seconds = seconds;
  }

  compute(): number {
    let dayT = 0,
      hourT = 0,
      minT = 0,
      secT = 0;

    if (this.days && this.days > 0) {
      dayT = this.days * 24 * 60 * 60 * 1000;
    }

    if (this.hours && this.hours > 0) {
      hourT = this.hours * 60 * 60 * 1000;
    }

    if (this.minutes && this.minutes > 0) {
      minT = this.minutes * 60 * 1000;
    }

    if (this.seconds && this.seconds > 0) {
      secT = this.seconds * 1000;
    }

    return hourT + minT + secT;
  }
}
