import Svg, { Path } from 'react-native-svg';
import { iconWithClassName } from './iconWithClassName';

export const Bluetooth = iconWithClassName((props) => (
    <Svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <Path d="m7 7 10 10-5 5V2l5 5L7 17" />
    </Svg>
));
