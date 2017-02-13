export interface IAllofwConfig {
    broadcasting?: {
        renderer: {
            sub: string;
        };
        simulator: {
            pub: string;
        }
    }

    navigation?: "window" | "network";

    http?: {
        static: string;
        port: number;
    }
}