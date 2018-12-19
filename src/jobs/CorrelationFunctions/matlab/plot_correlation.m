function plot_correlation(img,correlation_type,path_to_write)

%%% types of correlation function available %%
% 1 : Two Point Autocorrelation
% 2 : Two point Lineal Path Correlation
% 3 : Two point Cluster Correlation
% 4 : Two point Surface-Surface Correlation
%%%
% img is the input image to be characterized

switch correlation_type
    case 1
        calc_Corr = @evaluate;
        disp('Using S2');
        Y_label = 'Two Point Autocorrelation';
        Correlation_name = 'Two_Point_Autocorrelation';
    case 2
        calc_Corr = @L_2D;
        disp('Using L2');
        Y_label = 'Two Point Lineal Path Correlation';
        Correlation_name = 'Lineal_Path_Correlation';
    case 3
        calc_Corr = @C2;
        disp('Using C2');
        Y_label = 'Two Point Cluster Correlation';
        Correlation_name = 'Cluster_Correlation';
    case 4
        calc_Corr = @Ss_2D;
        disp('Using Surf2');
        Y_label = 'Two Point Surface-Surface Correlation';
        Correlation_name = 'Surface_Correlation';
end

Correlation = calc_Corr(img); % calculate required correlation for input image

figure('color',[1,1,1])
hold on;
plot( 0:1:length(Correlation)-1, Correlation , 'LineWidth',2.5);
xlabel('Distance (Pixel)');
ylabel(Y_label);
box on;
saveas(gcf,[path_to_write,'/Correlation.jpg']);
hold off;

%Save Correlation data
%save([path_to_write,'/',Y_label,'.mat'],'Correlation');

Correlation = array2table(Correlation);
Correlation.Properties.VariableNames = {Correlation_name};
writetable(Correlation,[path_to_write,'/',Y_label,'.csv']);

%imwrite(img,[path_to_write,'/','Input1.jpg']);

end
