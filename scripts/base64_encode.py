#!/usr/bin/env python

import sys
import base64
import os

def main():
    if len(sys.argv) != 3:
        print("Usage: base64_encode <binary source file> <dest file or folder>")
        return 1
    
    src_path = sys.argv[1]
    dst_path = sys.argv[2]

    if os.path.isdir(dst_path):
        basename = os.path.basename(src_path)
        base_stem, _base_ext = os.path.splitext(basename)

        outname = base_stem + ".b64"
        dst_path = os.path.join(dst_path, outname)
        print("Output is folder, saving to: %s" % dst_path)

    with open(src_path, "rb") as infile:
        raw_data = infile.read()
    
    b64_data = base64.b64encode(raw_data)

    with open(dst_path, "w") as outfile:
        outfile.write(b64_data)

    return 0


if __name__ == "__main__":
    sys.exit(main())
