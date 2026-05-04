#include <stdint.h>
#include <stdio.h>

static uint64_t monitor_seed = 0x1122334455667788ULL;

static uint64_t accumulate(const uint64_t *values, size_t count) {
    uint64_t acc = monitor_seed;

    for (size_t index = 0; index < count; ++index) {
        acc ^= values[index] + (index << 8);
    }

    return acc;
}

int main(void) {
    uint64_t scratch[4] = {
        0x1111111111111111ULL,
        0x2222222222222222ULL,
        0x3333333333333333ULL,
        0x4444444444444444ULL,
    };
    uint64_t digest = accumulate(scratch, 4);

    puts("Hello from RISC-V!");
    printf("digest=0x%016llx\n", (unsigned long long)digest);

    return (int)(digest & 0xffU);
}
