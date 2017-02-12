export interface IAllofwConfig {
    broadcasting?: {
        renderer: {
            sub: string;
        };
        simulator: {
            pub: string;
        }
    }

    http?: {
        static: string;
        port: number;
    }
}