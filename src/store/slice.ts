import { createSlice } from "@reduxjs/toolkit";
import { WorkerOut } from "../requests/worker/types.ts";

export const dataSlice = createSlice({
	name: "data",
	initialState: {
		user: null as WorkerOut | null,
		isAuthenticated: false,
	},
	reducers: {
		setUser: (state, action) => {
			state.user = action.payload;
			state.isAuthenticated = !!action.payload;
		},
		clearUser: (state) => {
			state.user = null;
			state.isAuthenticated = false;
		}
	},
});

export const {
	setUser,
	clearUser,
} = dataSlice.actions;

export default dataSlice.reducer;
