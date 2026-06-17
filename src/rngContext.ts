/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from "react";

export const RngContext = createContext<() => number>(Math.random);

export const useRng = () => useContext(RngContext);
