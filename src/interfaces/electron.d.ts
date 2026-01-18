/**
 * Definiciones globales para el objeto window.electronAPI
 * Este archivo NO debe tener imports para ser interpretado como un script global de ambiente.
 */

interface IElectronAPI {
    agregarEmpleado: (empleado: {
        DNI: number;
        nombre: string;
        apellido: string;
        tel: number;
        address: string;
        edad: number;
    }) => Promise<any>;
    obtenerEmpleados: () => Promise<any[]>;
    obtenerEmpleadoPorId: (id: number) => Promise<any | null>;
    eliminarEmpleado: (id: number) => Promise<boolean>;
    verificarDNI: (DNI: number, idExcluir?: number) => Promise<boolean>;
    agregarGasto: (
        empleadoId: number,
        monto: number,
        descripcion: string,
        fecha: string,
        ruta?: string
    ) => Promise<any | null>;
    obtenerGastos: (empleadoId?: number) => Promise<any[]>;
    agregarGastosLote: (gastos: any[]) => Promise<boolean>;
    actualizarGasto: (id: number, monto: number, descripcion: string, fecha: string, ruta?: string) => Promise<boolean>;
    eliminarGasto: (id: number) => Promise<boolean>;
    actualizarEmpleado: (id: number, empleado: any) => Promise<boolean>;

    // Auth
    existeUsuario: () => Promise<boolean>;
    registrarUsuario: (nick: string, pass: string, pregunta: string, respuesta: string) => Promise<boolean>;
    login: (nick: string, pass: string) => Promise<boolean>;
    obtenerPregunta: () => Promise<string | null>;
    verificarRecuperacion: (respuesta: string) => Promise<boolean>;
    resetPassword: (nuevaPassword: string) => Promise<boolean>;
    ejecutarMantenimiento: (nick: string, pass: string) => Promise<{ success: boolean; message: string }>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
        bootstrap: {
            Modal: {
                new(element: HTMLElement): any;
                getInstance(element: HTMLElement): any;
            };
            Collapse: {
                getInstance(element: HTMLElement): any;
            };
        };
    }

    var electronAPI: IElectronAPI;
    var bootstrap: {
        Modal: {
            new(element: HTMLElement): any;
            getInstance(element: HTMLElement): any;
        };
        Collapse: {
            getInstance(element: HTMLElement): any;
        };
    };
}

export { };
