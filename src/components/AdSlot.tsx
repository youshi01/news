type AdSlotProps = {
  placement: string;
};

export function AdSlot({ placement }: AdSlotProps) {
  return <div data-ad-slot={placement} hidden />;
}
