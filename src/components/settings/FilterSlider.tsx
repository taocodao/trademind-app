'use client';

interface FilterSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
    formatValue?: (value: number) => string;
    color?: 'purple' | 'green' | 'yellow' | 'red';
}

const colorClasses = {
    purple: 'accent-tm-purple',
    green: 'accent-tm-green',
    yellow: 'accent-yellow-500',
    red: 'accent-red-500',
};

export function FilterSlider({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    onChange,
    formatValue,
    color = 'purple',
}: FilterSliderProps) {
    const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm text-tm-muted">{label}</label>
                <span className="text-sm font-mono font-medium">{displayValue}</span>
            </div>
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={`
                        w-full h-2 bg-tm-surface rounded-lg appearance-none cursor-pointer
                        ${colorClasses[color]}
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110
                    `}
                    style={{
                        background: `linear-gradient(to right, var(--tw-gradient-from) ${percentage}%, rgb(30, 30, 40) ${percentage}%)`,
                        ['--tw-gradient-from' as string]: color === 'purple' ? '#a855f7' : color === 'green' ? '#22c55e' : color === 'yellow' ? '#eab308' : '#ef4444',
                    }}
                />
            </div>
            <div className="flex justify-between text-xs text-tm-muted">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

interface RangeSliderProps {
    label: string;
    minValue: number;
    maxValue: number;
    rangeMin: number;
    rangeMax: number;
    step?: number;
    unit?: string;
    onMinChange: (value: number) => void;
    onMaxChange: (value: number) => void;
}

export function RangeSlider({
    label,
    minValue,
    maxValue,
    rangeMin,
    rangeMax,
    step = 1,
    unit = '',
    onMinChange,
    onMaxChange,
}: RangeSliderProps) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm text-tm-muted">{label}</label>
                <span className="text-sm font-mono font-medium">
                    {minValue}{unit} - {maxValue}{unit}
                </span>
            </div>
            <div className="flex gap-3 items-center">
                <input
                    type="number"
                    min={rangeMin}
                    max={maxValue}
                    step={step}
                    value={minValue}
                    onChange={(e) => onMinChange(Math.min(Number(e.target.value), maxValue))}
                    className="w-16 bg-tm-surface rounded-lg px-2 py-1.5 text-sm font-mono text-center border border-white/10 focus:border-tm-purple focus:outline-none"
                />
                <div className="flex-1 h-1 bg-tm-purple/30 rounded-full relative">
                    <div
                        className="h-full bg-tm-purple rounded-full"
                        style={{
                            marginLeft: `${((minValue - rangeMin) / (rangeMax - rangeMin)) * 100}%`,
                            width: `${((maxValue - minValue) / (rangeMax - rangeMin)) * 100}%`,
                        }}
                    />
                </div>
                <input
                    type="number"
                    min={minValue}
                    max={rangeMax}
                    step={step}
                    value={maxValue}
                    onChange={(e) => onMaxChange(Math.max(Number(e.target.value), minValue))}
                    className="w-16 bg-tm-surface rounded-lg px-2 py-1.5 text-sm font-mono text-center border border-white/10 focus:border-tm-purple focus:outline-none"
                />
            </div>
        </div>
    );
}
