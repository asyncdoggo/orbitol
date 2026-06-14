'use strict';

import { engineInit } from 'littlejsengine';
import {
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
} from './sim/gameCallbacks.js';

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
