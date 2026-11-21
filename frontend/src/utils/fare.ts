export const calculateFare = (distance, seats) => {
    const base = 20;
    const rate = 12;
    let total = base + (distance * rate);
    if (seats > 1) total = total * (1 - (seats * 0.05));
    return parseFloat(total.toFixed(2));
};
