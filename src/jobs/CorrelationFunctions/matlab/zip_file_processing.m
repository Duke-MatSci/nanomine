function zip_file_processing(path_to_write,correlation_type)

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

images = dir([path_to_unzip_files])

num_images = length(images)-2;

for i = 1 : num_images
    img = imread([path_to_unzip_files,'/',images(i+2).name]);
    
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
    else
        Correlation_all(:,i) = calc_Corr(Target_img);
    end
    

end
Correlation_all(:,num_images+1) = mean(Correlation_all(:,1:num_images),2);
%save([path_to_write,'/',Y_label,'.mat'],'Correlation_all');

figure('color',[1,1,1])
hold on;



for i = 1 : num_images
    plot(0:1:length(Correlation_all(:,i))-1, Correlation_all(:,i) , 'LineWidth',2.5);
    legendInfo{i} = images(i+2).name;
    legendInfo_table{i} = ['Input',num2str(i)]; % for variable name in table
    hold on;
end
plot(0:1:length(Correlation_all(:,i))-1, Correlation_all(:,num_images+1) , 'LineWidth',2.5);
legendInfo{num_images+1}='Mean';
legendInfo_table{num_images+1}='Mean';
xlabel('Distance (Pixel)');
ylabel(Y_label);
box on;
legend(legendInfo);
saveas(gcf,[path_to_write,'/','Correlation.jpg']);
hold off;

% save correlation of all images
Correlation_all = array2table(Correlation_all);
Correlation_all.Properties.VariableNames = legendInfo_table;
writetable(Correlation_all,[path_to_write,'/',Y_label,'.csv']);

end
