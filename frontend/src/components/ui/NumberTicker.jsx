/**
 * NumberTicker — Animasyonlu sayı bileşeni.
 * Değer değiştiğinde spring ile yumuşak sayar.
 *
 * Props:
 *   value    — hedef sayı
 *   decimals — ondalık basamak sayısı (varsayılan 0)
 *   prefix   — önek (örn. "₺")
 *   suffix   — sonek (örn. " kWh")
 */
import { useEffect, useRef, useState } from 'react';
import { useSpring, useMotionValue, useTransform, motion } from 'framer-motion';

const NumberTicker = ({ value, decimals = 0, prefix = '', suffix = '', className = '', style = {} }) => {
    const motionVal = useMotionValue(value ?? 0);
    const spring    = useSpring(motionVal, { damping: 28, stiffness: 70, mass: 0.8 });

    // displayed = formatted string reactive to spring
    const [display, setDisplay] = useState(() =>
        `${prefix}${(value ?? 0).toFixed(decimals)}${suffix}`
    );

    // spring subscriber → update display string
    useEffect(() => {
        const unsub = spring.on('change', v => {
            setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`);
        });
        return unsub;
    }, [spring, prefix, suffix, decimals]);

    // drive spring when value changes
    useEffect(() => {
        if (value != null && isFinite(value)) motionVal.set(value);
    }, [value, motionVal]);

    return (
        <motion.span className={className} style={style}>
            {display}
        </motion.span>
    );
};

export default NumberTicker;
