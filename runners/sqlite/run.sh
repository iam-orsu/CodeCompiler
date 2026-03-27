#!/bin/sh
# Concatenate seed data + user query, pipe to sqlite3
cat /seed.sql "$1" | sqlite3 :memory:
