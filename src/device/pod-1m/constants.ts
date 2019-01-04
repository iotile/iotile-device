import { mapStreamName } from "@iotile/iotile-common";

export const WINDOW_BITS = 8;
export const LOOKAHEAD_BITS = 4;
export const INPUT_BUFFER_LENGTH = 64;
export const SAMPLING_RATE = 3200 / 3.0;

export const START_STREAM = mapStreamName('system buffered node 1536');
export const END_STREAM = mapStreamName('system buffered node 1537');
