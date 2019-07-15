function Plot_Correlation(Target, Recon, path_to_write)
%% import target image %%

S2_target = evaluate(Target);


%% Begin Slicing
num_slices = 10;

Recon_size = size(Recon,1);

Slice = zeros(Recon_size, Recon_size, num_slices);
Array_length = size(evaluate(Slice(:,:,1)),1);
for i = 1 : num_slices
    Slice(:,:,i) = Recon(:,:,round(0.9 *i*(Recon_size/num_slices)));
end

S2_recon = zeros(Array_length,num_slices);

for i = 1 : num_slices
    S2_recon(:,i) = evaluate(Slice(:,:,i));
end

Mean_S2_recon = mean(S2_recon,2);

%% Plots %%
figure('color',[1,1,1]);
hold on
plot( 0:1:length(S2_target)-1, S2_target , 'LineWidth',2)
plot( 0:1:length(Mean_S2_recon)-1, Mean_S2_recon, 'r--', 'LineWidth',2 )
xlabel('Distance (Pixel)')
ylabel('Autorrelation Function')
box on
legend('Target Image', 'Mean of 2D Reconstructed images')
hold off
saveas(gcf,[path_to_write,'/','Autocorrelation_comparison.jpg']);

imwrite(Slice(:,:,round(0.25*num_slices)),[path_to_write,'/','Slice.jpg']);
end
