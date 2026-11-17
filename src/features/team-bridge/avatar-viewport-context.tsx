/**
 * React side of `avatar-viewport.ts`: the list provides a signal, a photo
 * control asks `useSeenInViewport(ref)` whether it may read its photo yet.
 * See that module for why the drawer gates photo reads on visibility.
 */
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react";
import { Dimensions, type View } from "react-native";
import {
	inAvatarViewport,
	type ViewportSignal,
} from "@/features/team-bridge/avatar-viewport";

const AvatarViewportContext = createContext<ViewportSignal | null>(null);

export function AvatarViewportProvider({
	signal,
	children,
}: {
	signal: ViewportSignal;
	children: ReactNode;
}) {
	return (
		<AvatarViewportContext.Provider value={signal}>
			{children}
		</AvatarViewportContext.Provider>
	);
}

/**
 * True once the view behind `ref` has been inside the visible band; true at
 * once when no list provides a signal. Latches: never goes back to false.
 */
export function useSeenInViewport(ref: RefObject<View | null>): boolean {
	const signal = useContext(AvatarViewportContext);
	const [seen, setSeen] = useState(signal === null);
	useEffect(() => {
		if (seen || !signal) return;
		let live = true;
		const check = () => {
			ref.current?.measureInWindow((_x, y, width, height) => {
				if (
					live &&
					inAvatarViewport(
						{ y, width, height },
						Dimensions.get("window").height,
					)
				)
					setSeen(true);
			});
		};
		const unsubscribe = signal.subscribe(check);
		// The first measure after commit can precede native layout (zeros);
		// one frame later the row has its box. The list's own layout and
		// content-size events cover anything slower.
		check();
		const frame = requestAnimationFrame(check);
		return () => {
			live = false;
			cancelAnimationFrame(frame);
			unsubscribe();
		};
	}, [seen, signal, ref]);
	return seen;
}
