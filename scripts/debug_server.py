#!/usr/bin/env python3
# This server exists for the sole purpose of allowing us to fetch
# CSV files in debugging, which must be done over HTTP (rather than
# with the file protocol) and must have the right CORS setting.

from http.server import HTTPServer, SimpleHTTPRequestHandler, test
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_header('Access-Control-Allow-Origin', '*')
    SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
  test(CORSRequestHandler, HTTPServer, port=int(sys.argv[1]) if len(sys.argv) > 1 else 8080)
