type User = {
    id: number;
    name: string;
    isAdmin: boolean;
};
type NewUser = {
    [P in keyof User]: User[P];
};
