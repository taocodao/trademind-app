# TradeMind.bot Frontend — Product Vision

## Product
TradeMind.bot — a web-based trading management dashboard for automated options and equity strategies.

## Users
- Solo trader managing theta, momentum, and TQQQ strategies
- Needs real-time signal visibility and one-click execution

## Core Features
- **Signal Dashboard**: Real-time trading signals via WebSocket
- **Trade Execution**: One-click order placement through Tastytrade API
- **Portfolio View**: Position monitoring and P/L tracking
- **Strategy Config**: Configure strategy parameters

## UX Principles
1. **Speed first** — traders need instant feedback
2. **Clear status** — always show what's running, what's pending
3. **Mobile-friendly** — check positions on the go
4. **Safe defaults** — prevent accidental order placement

## Constraints
- Must work with Tastytrade OAuth flow
- WebSocket connection to backend signal publisher
- Real-time data refresh without page reload
