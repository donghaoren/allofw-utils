export interface IAllofwConfig {
    broadcasting?: {
        renderer: {
            sub: string;
            push: string;
        };
        simulator: {
            pub: string;
            pull: string
        }
    }

    navigation?: "window" | "network";

    http?: {
        static: string;
        port: number;
    }
}