function [target_corrf,L1,L2]=zip_file_processing_recon(path_to_write,correlation_type)

switch correlation_type
    case 1
        calc_Corr = @evaluate;
        disp('Using S2');
        Y_label = 'Two Point Autocorrelation';
    case 2
        calc_Corr = @L_2D;
        disp('Using L2');
        Y_label = 'Two Point Lineal Path Correlation';
    case 3
        calc_Corr = @C2;
        disp('Using C2');
        Y_label = 'Two Point Cluster Correlation';
    case 4
        calc_Corr = @Ss_2D;
        disp('Using Surf2');
        Y_label = 'Two Point Surface-Surface Correlation';
end

path_to_unzip_files = [path_to_write,'/input'];

images = dir(path_to_unzip_files);

num_images = length(images)-2;

for i = 1 : num_images
    img = imread([path_to_unzip_files,'/',images(i+2).name]);

    L1 = size(img,1); L2 = size(img,2);
    if length(size(img)) > 2
       img = img(:,:,1);
    end

    if (max(max(img))) > 1
      Target_img = round(img/256);
    else
      Target_img = img;
    end
    imwrite(256*Target_img,[path_to_write,'/','Input',num2str(i),'.jpg']);
    if i == 1
        Correlation = calc_Corr(Target_img);
        Correlation_all = zeros(length(Correlation),num_images+1);
        Correlation_all(:,i) = Correlation;
%         S2_auto = evaluate(Target_img);
%         L2_auto = L_2D(Target_img);
%         C2_auto = C2(Target_img);
%         Surf2_auto = Ss_2D(Target_img);
%         S2_all = zeros(length(S2_auto),num_images+1);
%         L2_all = zeros(length(L2_auto),num_images+1);
%         C2_all = zeros(length(C2_auto),num_images+1);
%         Surf2_all = zeros(length(Surf2_auto),num_images+1);
%         S2_all(:,i) = S2_auto;
%         L2_all(:,i) = L2_auto;
%         C2_all(:,i) = C2_auto;
%         Surf2_all(:,i) = Surf2_auto;
    else
        Correlation_all(:,i) = calc_Corr(Target_img);
%         S2_all(:,i) = evaluate(Target_img);
%         L2_all(:,i) = L_2D(Target_img);
%         C2_all(:,i) = C2(Target_img);
%         Surf2_all(:,i) = Ss_2D(Target_img);
    end
end
Correlation_all(:,num_images+1) = mean(Correlation_all(:,1:num_images),2);
% S2_all(:,num_images+1) = mean(S2_all(:,1:num_images),2);
% L2_all(:,num_images+1) = mean(L2_all(:,1:num_images),2);
% C2_all(:,num_images+1) = mean(C2_all(:,1:num_images),2);
% Surf2_all(:,num_images+1) = mean(Surf2_all(:,1:num_images),2);

% S2_target = S2_all(:,num_images+1);
% L2_target = L2_all(:,num_images+1);
% C2_target = C2_all(:,num_images+1);
% Surf2_target = Surf2_all(:,num_images+1);


target_corrf = Correlation_all(:,num_images+1);
%save([path_to_write,'/',Y_label,'.mat'],'Correlation_all'); 

path_to_write_charc_result = [path_to_write,'/','Characterization','/'];
mkdir(path_to_write_charc_result);
figure('color',[1,1,1])
hold on;


for i = 1 : num_images
    plot(0:1:length(Correlation_all(:,i))-1, Correlation_all(:,i) , 'LineWidth',2.5);
    legendInfo{i} = images(i+2).name; % for plotting
    legendInfo_table{i} = ['Input',num2str(i)]; % for variable name in table
    hold on;
end
plot(0:1:length(Correlation_all(:,i))-1, Correlation_all(:,num_images+1) , 'LineWidth',2.5);
legendInfo{num_images+1}='Mean';
legendInfo_table{num_images+1}='Mean';
xlabel('Distance (Pixel)');
ylabel(Y_label);
box on;
legend(legendInfo_table);
saveas(gcf,[path_to_write_charc_result,'/','Correlation.jpg']);
hold off;

%% Saving Useful Data %%
 Correlation_all = array2table(Correlation_all);
%  S2_all = array2table(S2_all); 
%  L2_all = array2table(L2_all); 
%  C2_all = array2table(C2_all); 
%  Surf2_all = array2table(Surf2_all); 

% Rename variables in table appropriately
Correlation_all.Properties.VariableNames = legendInfo_table;
% S2_all.Properties.VariableNames = legendInfo_table;
% L2_all.Properties.VariableNames = legendInfo_table;
% C2_all.Properties.VariableNames = legendInfo_table;
% Surf2_all.Properties.VariableNames = legendInfo_table;

% Save tables
writetable(Correlation_all,[path_to_write,'/Characterization/',Y_label,'.csv']);
% writetable(S2_all,[path_to_write,'/Characterization/','Autocorrelation.csv']);
% writetable(L2_all,[path_to_write,'/Characterization/','Lineal_Path_Correlation.csv']);
% writetable(C2_all,[path_to_write,'/Characterization/','Cluster_Correlation.csv']);
% writetable(Surf2_all,[path_to_write,'/Characterization/','Surface_Correlation.csv']);
% save([path_to_write_charc_result,'/2 Point Autocorrelation.mat'],'S2_all');
% save([path_to_write_charc_result,'/2 Point Lineal Path Correlation.mat'],'L2_all');
% save([path_to_write_charc_result,'/2 Point Cluster Correlation.mat'],'C2_all');
% save([path_to_write_charc_result,'/2 Point Surface Correlation.mat'],'Surf2_all');
end
