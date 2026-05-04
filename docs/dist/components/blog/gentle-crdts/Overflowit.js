// @ts-ignore
import React, { useEffect } from 'https://esm.sh/react';
export default function Overflowit() {
    const [num, setNum] = React.useState(BigInt(0));
    useEffect(() => {
        let mounted = true;
        let lastTime = Date.now();
        function redraw() {
            if (!mounted)
                return;
            const now = Date.now();
            const delta = now - lastTime;
            lastTime = now;
            // 1k ticks per millisecond → 1mil ticks per second
            const ticks = delta * 1000;
            setNum((num) => num + BigInt(ticks));
            requestAnimationFrame(redraw);
        }
        requestAnimationFrame(redraw);
        return () => {
            mounted = false;
        };
    }, []);
    return React.createElement("span", null, num.toString());
}
