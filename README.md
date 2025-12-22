# Simple VTT to host on simple Apache server

Simple Virtual Table Top, that you can build and host on apache server. Simpliest option ever. 

## Features:
- maps as backgrounds, just prepare it to fit the grid 64x64px
- droping map elements on grid - building, furniture, details, what you want
- tokens, drop tokens, move tokens, remove tokens
- zoom in/zoom out
- roll a dice, or a few die, add modifier
- Fog of war - simple, but sometimes usefull fog of war, with 50% opacity for GM

## Requirements

### To build an app:
- Node.js 18+ (https://nodejs.org/)
- Windows (if you use build.bat)

### Server to run:
- PHP 7.4+
- Support .htaccess (Apache) or similar nginx config

## Fast Start (Windows)

### 1. Build a pack

Run throug termina:

```build.bat```

Or, if you want to setup a custom password

```build.bat {my_custom-password}```

Or, if you want to setup a custom password and custom path on domain

```build.bat {my_custom-password} /my-game/room1/```

#### Full params details: 

build.bat [password] [path] [allowed_origins]

Przykłady:
build.bat                                                   # default password: 2137, default path: /vtt/room1/
build.bat {my_custom-password}                              # setup custom password
build.bat {my_custom-password} /game/                       # setup custom password and path  
build.bat {my_custom-password} /game/ en                    # setup custom password, path and language (pl or en)
build.bat {my_custom-password} /game/ en https://domain.com # setup custom password, path, language and allowed origins

## If built was sucessful

There should be created "build" folder. Just upload its contents into your desired folder on server.

Don't forget to put your assets into backend/asstes/map, backend/asstes/tokens, backend/asstes/backgrounds

And make sure, that /backend/data has proper save/read properties: `chmod 755 backend/data/`.

# For Devs:

Start backend: 
```
cd backend
php -S localhost:8080
```

start frontend: 
```
cd frontend
npm install
npm run dev
```