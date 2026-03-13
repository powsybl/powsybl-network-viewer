/*
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * Represents the draw event types for the network map.<br/>
 * when a draw event is triggered, the event type is passed to the onDrawEvent callback<br/>
 * On create, when the user create a new polygon (shape finished)
 */
export enum DRAW_EVENT {
    CREATE = 1,
    UPDATE = 2,
    DELETE = 0,
}
