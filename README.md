# 🃏 Conquer Card

An Ethiopian social card game — multiplayer mobile app built with React Native + Expo.

## Stack
| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo + Expo Router |
| State | Zustand |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL (Railway) + Redis |
| Auth | Firebase Auth |
| ORM | Prisma |
| Game Engine | Pure TypeScript (shared) |
| Real-time | Socket.io |
| Voice | Agora.io |
| Analytics | PostHog |
| Errors | Sentry |
| Hosting | Railway |
| Distribution | Expo EAS Build |

## Project Structure


## Getting Started

### 1. Clone and install


### 2. Set up environment


### 3. Run database migrations


### 4. Run engine tests


### 5. Start the server


### 6. Start the mobile app


## Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
|  | Client → Server | Join a game room |
|  | Client → Server | Start the game (min 2 players) |
|  | Client → Server | Play a card from hand |
|  | Server → Client | Current room state |
|  | Server → Client | Game has started with dealt hands |
|  | Server → Client | Updated state after action |
|  | Server → Client | Game finished with winner |
|  | Server → Client | A player dropped |

## Deployment

### Railway (Backend)
1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add PostgreSQL + Redis plugins
4. Set env vars from 

### Expo EAS (Mobile)
